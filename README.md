
# ImageTag

ImageTag is a Python-based tool for automatically tagging images using the OpenAI Vision API. It processes images in a specified directory, retrieves existing tags, and sets new tags if none exist.

## Features

- Supports various image formats: `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.tiff`, `.webp`
- Retrieves existing tags using macOS `mdls` command
- Sets tags using `xattr`
- Utilizes OpenAI's GPT-4 model for generating image tags
- Concurrent processing with multi-threading

## Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/yourusername/imgtag.git
    cd imgtag
    ```

2. Install the required dependencies:

    ```bash
    pip install -r requirements.txt
    ```

3. Set the necessary environment variables:

    - `OPENAI_API_KEY`: Your OpenAI API key
    - `IMAGE_DIRECTORY`: Path to the directory containing images (default: current directory)
    - `DETAIL_LEVEL`: Level of detail for tags (`low` or `high`, default: `low`)

## Usage

Run the script using Python:

```bash
python imgtag.py
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

## License

This project is licensed under the MIT License.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## Acknowledgements

- [OpenAI](https://openai.com/) for the GPT-4 model.