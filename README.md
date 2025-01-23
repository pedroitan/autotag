
# ImageTagMan

ImageTagMan is a Python-based tool for automatically tagging images using the OpenAI Vision API. It processes images in a specified directory, retrieves existing tags, and sets new tags if none exist.

## Features

- Supports various image formats: `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.tiff`, `.webp`
- Retrieves existing tags using macOS `mdls` command
- Sets tags using `xattr`
- Utilizes OpenAI's GPT-4 model for generating image tags
- Concurrent processing with multi-threading

## Manual Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/joeldg/imgtagman.git
    cd imgtagman
    ```

2. Install:

    ```bash
    python setup.py sdist bdist_wheel && pip install .
    ```

3. Set the necessary environment variables:

    - `OPENAI_API_KEY`: Your OpenAI API key
    - `IMAGE_DIRECTORY`: Path to the directory containing images (default: current directory)
    - `DETAIL_LEVEL`: Level of detail for tags (`low` or `high`, default: `low`)

## Usage

Run the script using Python:

```bash
imgtagman --help

usage: imgtagman [-h] {tag,remove-tags,summary} ...

Image Tag Management Tool

positional arguments:
  {tag,remove-tags,summary}
                        Available commands
    tag                 Tag images in the directory
    remove-tags         Remove tags from images
    summary             Summarize image tags

options:
  -h, --help            show this help message and exit
```

## Configuration

You can configure the tool by setting environment variables:

- **IMAGE_DIRECTORY**: Specify the directory containing images to process.
- **DETAIL_LEVEL**: Set the level of detail for generated tags (`low` or `high`).

Example:

```bash
export IMAGE_DIRECTORY=/path/to/images
export DETAIL_LEVEL=high
python imgtag.py
```

## homepage (pages)
https://joeldg.github.io/imgtagman/

## License

This project is licensed under the MIT License.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## Acknowledgements

- [OpenAI](https://openai.com/) for the GPT-4 model.