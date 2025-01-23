import os
from collections import Counter, defaultdict
from pathlib import Path
from junk.imgtag import get_file_tags
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading


def summarize_tags(directory_path):
    """Summarize tags from all images in a directory."""
    image_extensions = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".webp"}
    dir_path = Path(directory_path)

    tag_counter = Counter()
    tag_to_files = defaultdict(list)
    lock = threading.Lock()

    def process_file(file_path):
        tags = get_file_tags(file_path)
        with lock:
            tag_counter.update(tags)
            for tag in tags:
                tag_to_files[tag].append(str(file_path))

    # Iterate through all files in the directory using multi-threading
    with ThreadPoolExecutor(max_workers=25) as executor:
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

    # Sort tags by count in descending order
    sorted_tags = tag_counter.most_common()

    # Print the table header
    print(f"{'Tag':<20} {'Count':<5} {'Files'}")
    print("-" * 60)

    # Print each tag and its count with up to five files
    for tag, count in sorted_tags:
        files = tag_to_files[tag][:5]
        files_str = ", ".join(files)
        print(f"{tag.strip():<20} {count:<5} {files_str}")


def main():
    # Get directory path from environment variable or use current directory
    directory = os.getenv("IMAGE_DIRECTORY", ".")
    summarize_tags(directory)


if __name__ == "__main__":
    main()
