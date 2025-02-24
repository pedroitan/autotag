import os
import base64
import subprocess
import json
import logging
from pathlib import Path
from openai import OpenAI
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Load environment variables from frontend/.env
frontend_env_path = Path(__file__).parent.parent / 'frontend' / '.env'
if not frontend_env_path.exists():
    logging.error(f".env file not found at {frontend_env_path}")
    raise FileNotFoundError(f".env file not found at {frontend_env_path}")

load_dotenv(frontend_env_path)

# Initialize OpenAI client
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    logging.error("OPENAI_API_KEY environment variable not found")
    raise ValueError("OPENAI_API_KEY environment variable not found")

client = OpenAI(api_key=api_key)

def get_file_tags(file_path):
    """Get existing tags from a file using mdls"""
    try:
        logging.info(f"Getting existing tags for: {file_path}")
        # Run mdls command to get tags
        result = subprocess.run(
            ["mdls", "-name", "kMDItemUserTags", str(file_path)],
            capture_output=True,
            text=True,
        )

        # Parse the output
        output = result.stdout.strip()
        if "null" in output or "(" not in output:
            logging.info(f"No existing tags found for: {file_path}")
            return []

        # Extract tags from the output
        tags = output.split("kMDItemUserTags = (")[-1].strip(")\n").strip()
        tags_list = [tag.strip(' "') for tag in tags.split(",") if tag.strip()]
        logging.info(f"Found existing tags for {file_path}: {tags_list}")
        return tags_list
    except Exception as e:
        logging.error(f"Error getting tags for {file_path}: {e}")
        return []


def set_file_tags(file_path, tags):
    """Set tags for a file using xattr"""
    try:
        logging.info(f"Setting tags for {file_path}: {tags}")
        
        # Convert tags list to XML plist string
        tags_xml = "\n".join([f"\t\t<string>{tag}</string>" for tag in tags])
        tags_str = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<array>
{tags_xml}
</array>
</plist>"""
        
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
        logging.info(f"Successfully set tags for: {file_path}")
    except Exception as e:
        logging.error(f"Error setting tags for {file_path}: {e}")
        raise


def get_tags_from_openai(image_path, detail_level="low"):
    """Get tags from OpenAI Vision API"""
    try:
        logging.info(f"Getting tags from OpenAI for: {image_path}")
        # Read and encode image
        with open(image_path, "rb") as image_file:
            base64_image = base64.b64encode(image_file.read()).decode("utf-8")

        # Prepare the prompt based on detail level
        prompt = (
            "Forneça no máximo dez tags em português para esta imagem, preferindo tags de uma única palavra quando possível. "
            "Se a imagem for complexa, você pode fornecer tags mais detalhadas. "
            "Se a imagem contiver texto, você pode incluir o conteúdo do texto simplificado (máximo três palavras) como tags. "
            "Ao simplificar texto nas imagens, prefira o conteúdo principal e ignore qualquer texto decorativo. "
            f"Use nível de detalhe {detail_level}. "
            "Responda apenas com as tags como um array JSON de strings."
        )

        logging.info("Making API request to OpenAI...")
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
                                "url": f"data:image/jpeg;base64,{base64_image}",
                                "detail": "low" if detail_level == "low" else "high"
                            },
                        },
                    ],
                }
            ],
            max_tokens=300,
        )

        # Parse response
        try:
            content = response.choices[0].message.content
            logging.info(f"OpenAI response: {content}")
            
            # Remove markdown code block if present
            if content.startswith("```"):
                content = content.split("\n", 1)[1]  # Remove first line with ```json
                content = content.rsplit("\n", 1)[0]  # Remove last line with ```
            
            tags = json.loads(content)
            logging.info(f"Parsed tags: {tags}")
            return tags
        except json.JSONDecodeError as e:
            logging.error(f"Failed to parse OpenAI response as JSON: {content}")
            logging.error(f"JSON parse error: {e}")
            return []
        except Exception as e:
            logging.error(f"Error processing OpenAI response: {e}")
            return []

    except Exception as e:
        logging.error(f"Error getting tags from OpenAI for {image_path}: {e}")
        return []


def process_file(file_path, detail_level="low"):
    """Process a single file: get tags and set new tags if none exist."""
    try:
        logging.info(f"Processing file: {file_path}")
        existing_tags = get_file_tags(file_path)
        
        if not existing_tags:
            logging.info(f"No existing tags found for {file_path}, getting new tags from OpenAI")
            new_tags = get_tags_from_openai(file_path, detail_level)
            if new_tags:
                logging.info(f"Setting new tags for {file_path}: {new_tags}")
                set_file_tags(file_path, new_tags)
            else:
                logging.warning(f"No tags were generated for {file_path}")
        else:
            logging.info(f"File {file_path} already has tags: {existing_tags}")
    except Exception as e:
        logging.error(f"Error processing file {file_path}: {e}")
        raise


def process_images(directory_path, detail_level="low"):
    """Process all images in a directory."""
    try:
        directory = Path(directory_path)
        if not directory.exists():
            logging.error(f"Directory does not exist: {directory_path}")
            raise FileNotFoundError(f"Directory does not exist: {directory_path}")

        logging.info(f"Processing directory: {directory_path}")
        image_files = []
        for ext in [".jpg", ".jpeg", ".png", ".gif", ".webp"]:
            image_files.extend(directory.glob(f"*{ext}"))
            image_files.extend(directory.glob(f"*{ext.upper()}"))

        if not image_files:
            logging.warning(f"No image files found in directory: {directory_path}")
            return

        logging.info(f"Found {len(image_files)} image files")
        
        with ThreadPoolExecutor() as executor:
            futures = {
                executor.submit(process_file, str(image_path), detail_level): image_path
                for image_path in image_files
            }
            
            for future in as_completed(futures):
                image_path = futures[future]
                try:
                    future.result()
                    logging.info(f"Successfully processed {image_path}")
                except Exception as e:
                    logging.error(f"Failed to process {image_path}: {e}")

    except Exception as e:
        logging.error(f"Error processing directory {directory_path}: {e}")
        raise


def main():
    """Main function to process command line arguments and start processing."""
    try:
        import sys
        if len(sys.argv) < 2:
            logging.error("No directory path provided")
            print("Usage: python imgtag.py <directory_path> [detail_level]")
            sys.exit(1)

        directory_path = sys.argv[1]
        detail_level = sys.argv[2] if len(sys.argv) > 2 else "low"
        
        logging.info(f"Starting image processing with directory: {directory_path}, detail_level: {detail_level}")
        process_images(directory_path, detail_level)
        logging.info("Processing completed successfully")
        
    except Exception as e:
        logging.error(f"Error in main: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
