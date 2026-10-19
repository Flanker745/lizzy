import os
import platform
import socket
import time
from datetime import timedelta

import psutil


_BOOT_TIME = psutil.boot_time()


def _safe_call(fn, default=None):
    try:
        return fn()
    except Exception:
        return default


def get_system_info():
    vm = psutil.virtual_memory()
    cpu_freq = _safe_call(psutil.cpu_freq)
    battery = _safe_call(psutil.sensors_battery)
    disk_partitions = []
    seen = set()
    for part in _safe_call(psutil.disk_partitions, []) or []:
        if part.mountpoint in seen:
            continue
        seen.add(part.mountpoint)
        usage = _safe_call(lambda: psutil.disk_usage(part.mountpoint))
        if usage is None:
            continue
        disk_partitions.append({
            "device": part.device,
            "mountpoint": part.mountpoint,
            "fstype": part.fstype,
            "total": usage.total,
            "used": usage.used,
            "free": usage.free,
            "percent": usage.percent,
        })

    net = _safe_call(psutil.net_io_counters)
    interfaces = []
    for name, stats in (_safe_call(psutil.net_if_stats, {}) or {}).items():
        interfaces.append({
            "name": name,
            "is_up": stats.isup,
            "speed_mbps": stats.speed,
            "mtu": stats.mtu,
        })

    processes = []
    for proc in _safe_call(psutil.process_iter, []) or []:
        try:
            info = proc.as_dict(attrs=["pid", "name", "cpu_percent", "memory_info", "status"])
            mi = info.pop("memory_info", None)
            info["memory_bytes"] = mi.rss if mi else 0
            processes.append(info)
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue
    processes.sort(key=lambda p: p.get("memory_bytes", 0), reverse=True)

    temperatures = []
    for group, entries in (_safe_call(psutil.sensors_temperatures, {}) or {}).items():
        for entry in entries or []:
            if entry.current is not None:
                temperatures.append({"sensor": group, "label": entry.label, "current": entry.current})

    try:
        with open("/etc/os-release", "r", encoding="utf-8") as f:
            os_release = dict(
                line.strip().split("=", 1) for line in f
                if "=" in line and not line.startswith("#")
            )
        distro = os_release.get("PRETTY_NAME", platform.system()).strip('"')
    except OSError:
        distro = platform.system()

    return {
        "timestamp": time.time(),
        "cpu": {
            "percent": psutil.cpu_percent(interval=0.15),
            "model": platform.processor() or _read_cpu_model(),
            "cores": psutil.cpu_count(logical=True),
            "physical_cores": psutil.cpu_count(logical=False),
            "frequency_mhz": round(cpu_freq.current, 1) if cpu_freq else None,
        },
        "memory": {
            "total": vm.total, "used": vm.used, "available": vm.available,
            "percent": vm.percent,
        },
        "disks": disk_partitions,
        "network": {
            "sent": net.bytes_sent if net else 0,
            "received": net.bytes_recv if net else 0,
            "interfaces": interfaces,
        },
        "battery": ({
            "percent": round(battery.percent),
            "plugged": battery.power_plugged,
            "secsleft": battery.secsleft if battery.secsleft >= 0 else None,
        } if battery else None),
        "os": {
            "system": distro,
            "release": platform.release(),
            "kernel": platform.version(),
            "architecture": platform.machine(),
            "hostname": socket.gethostname(),
            "uptime_seconds": max(0, int(time.time() - _BOOT_TIME)),
        },
        "processes": processes[:50],
        "temperatures": temperatures,
    }


def _read_cpu_model():
    try:
        with open("/proc/cpuinfo", "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                if line.lower().startswith(("model name", "hardware")) and ":" in line:
                    return line.split(":", 1)[1].strip()
    except OSError:
        pass
    return "Unknown CPU"
