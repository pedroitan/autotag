import os
import base64
import subprocess
import json
from pathlib import Path
from openai import OpenAI
from concurrent.futures import ThreadPoolExecutor, as_completed

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def get_file_tags(file_path):
    """Get existing tags from a file using mdls"""
    try:
        # Run mdls command to get tags
        result = subprocess.run(
            ["mdls", "-name", "kMDItemUserTags", str(file_path)],
            capture_output=True,
            text=True,
        )

        # Parse the output
        output = result.stdout.strip()
        if "null" in output or "(" not in output:
            return []

        # Extract tags from the output
        tags = output.split("kMDItemUserTags = (")[-1].strip(")\n").strip()
        return [tag.strip(' "') for tag in tags.split(",") if tag.strip()]
    except Exception as e:
        print(f"Error getting tags for {file_path}: {e}")
        return []


def set_file_tags(file_path, tags):
    """Set tags for a file using xattr"""
    try:
        # Convert tags list to XML plist string
        tags_xml = "\n".join([f"\t\t<string>{tag}</string>" for tag in tags])
        tags_str = f"""<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
\t<array>
{tags_xml}
\t</array>
</plist>
"""

        # Use xattr to set tags
        subprocess.run(
            [
                "xattr",
                "-w",
                "com.apple.metadata:_kMDItemUserTags",
                tags_str,
                str(file_path),
            ],
            check=True,
        )
        print(f"Successfully set tags for {file_path}: {tags}")
    except Exception as e:
        print(f"Error setting tags for {file_path}: {e}")


def get_tags_from_openai(image_path, detail_level="low"):
    """Get tags from OpenAI Vision API"""
    try:
        # Read and encode image
        with open(image_path, "rb") as image_file:
            base64_image = base64.b64encode(image_file.read()).decode("utf-8")

        # Prepare the prompt based on detail level
        prompt = (
            "Provide at most ten tags for this image preferring single word tags where possible. "
            "If the image is complex, you can provide more detailed tags."
            "If the image contains text, you can include the simplified text (max three words) content as tags. "
            "When simplifying text in images, prefer the main content and ignore any decorative text. "
            f"Use {detail_level} level of detail. "
            "Respond with only the tags as a JSON array of strings."
        )

        # Make API request
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            },
                        },
                    ],
                }
            ],
            max_tokens=300,
        )

        # Parse response and extract tags
        try:
            tags_text = response.choices[0].message.content
            # Remove Markdown code block syntax if present
            if tags_text.startswith("```json") and tags_text.endswith("```"):
                tags_text = tags_text.replace("```json", "").replace("```", "").strip()
            # Try to parse as JSON first
            try:
                tags = json.loads(tags_text)
            except json.JSONDecodeError:
                # If not valid JSON, split by commas and clean up
                tags = [tag.strip(' "[]').lower() for tag in tags_text.split(",")]

            return tags if isinstance(tags, list) else []
        except Exception as e:
            print(f"Error parsing OpenAI response: {e}")
            return []

    except Exception as e:
        print(f"Error getting tags from OpenAI for {image_path}: {e}")
        return []


def process_file(file_path, detail_level):
    """Process a single file: get tags and set new tags if none exist."""
    # print(f"\nProcessing: {file_path}")
    existing_tags = get_file_tags(file_path)

    if not existing_tags:
        print("No existing tags found, getting tags from OpenAI...")
        new_tags = get_tags_from_openai(file_path, detail_level)

        if new_tags:
            set_file_tags(file_path, new_tags)
        else:
            print("Failed to get tags from OpenAI")
    else:
        print(f"File already has tags: {existing_tags}")


def process_images(directory_path, detail_level="low"):
    """Process all images in a directory."""
    # Define image extensions to process
    image_extensions = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".webp"}

    # Convert directory path to Path object
    dir_path = Path(directory_path)

    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = [
            executor.submit(process_file, file_path, detail_level)
            for file_path in dir_path.glob("*")
            if file_path.suffix.lower() in image_extensions
        ]

        for future in as_completed(futures):
            try:
                future.result()
            except Exception as e:
                print(f"Error processing file: {e}")


def main():
    # Get directory path and detail level from environment variables or use defaults
    directory = os.getenv("IMAGE_DIRECTORY", ".")
    detail_level = os.getenv("DETAIL_LEVEL", "low")

    if detail_level not in ["low", "high"]:
        print("Invalid detail level. Using 'low' as default.")
        detail_level = "low"

    print(f"Processing directory: {directory}")
    print(f"Detail level: {detail_level}")

    process_images(directory, detail_level)


if __name__ == "__main__":
    main()
