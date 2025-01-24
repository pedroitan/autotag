import os
import subprocess
from pathlib import Path
from imgtagman.imgtag import get_file_tags
from concurrent.futures import ThreadPoolExecutor, as_completed


def remove_tags(file_path):
    """Remove tags from a file using xattr"""
    try:
        subprocess.run(
            ["xattr", "-d", "com.apple.metadata:_kMDItemUserTags", str(file_path)],
            check=True,
        )
        print(f"Removed tags from {file_path}")
    except subprocess.CalledProcessError:
        print(f"No tags to remove for {file_path}")
    except Exception as e:
        print(f"Error removing tags for {file_path}: {e}")


def process_file(file_path):
    """Process a single file: remove tags if they exist."""
    print(f"\nProcessing: {file_path}")
    tags = get_file_tags(file_path)
    if tags:
        remove_tags(file_path)
    else:
        print(f"No tags found for {file_path}")


def remove_tags_from_images(directory_path):
    """Remove tags from all images in a directory."""
    # Get directory path from environment variable or use current directory
    directory = os.getenv("IMAGE_DIRECTORY", directory_path)
    image_extensions = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".webp"}
    dir_path = Path(directory)

    with ThreadPoolExecutor(max_workers=50) as executor:
        futures = [
            executor.submit(process_file, file_path)
            for file_path in dir_path.glob("*")
            if file_path.suffix.lower() in image_extensions
        ]

        for future in as_completed(futures):
            try:
                future.result()
            except Exception as e:
                print(f"Error processing file: {e}")


def main():
    remove_tags_from_images(".")


if __name__ == "__main__":
    main()
