import os
from pathlib import Path

from dotenv import load_dotenv
from google import genai


# Load the API key from the .env file
load_dotenv(Path(__file__).with_name(".env"))

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise RuntimeError(
        "API key not found. Check that your .env file exists "
        "and contains GEMINI_API_KEY."
    )

# Connect Lizzy to Gemini
client = genai.Client(api_key=API_KEY)


def ask_lizzy(message):
    """Send a message to Gemini and return Lizzy's response."""

    response = client.models.generate_content(
        model="gemini-3.8-flash",
        contents=(
            "You are Lizzy, a personal AI assistant. "
            "Be helpful, clear, friendly, and honest. "
            "Explain technical topics simply when needed.\n\n"
            f"User: {message}"
        ),
    )

    return response.text or "I couldn't generate a response."


def main():
    print("=" * 40)
    print("          LIZZY AI ASSISTANT")
    print("=" * 40)
    print("Connected to Gemini AI.")
    print("Type 'exit' to close Lizzy.\n")

    while True:
        message = input("You: ").strip()

        if message.lower() == "exit":
            print("Lizzy: Goodbye! See you soon.")
            break

        if not message:
            print("Lizzy: Please enter a message.")
            continue

        try:
            reply = ask_lizzy(message)
            print(f"\nLizzy: {reply}\n")

        except Exception as error:
            print("\nLizzy: I couldn't connect properly.")
            print("Error details:", error)
            print("Check your internet connection, API key,")
            print("model availability, and free-tier quota.\n")


if __name__ == "__main__":
    main()