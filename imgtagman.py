import argparse
from junk.imgtag import process_images  # Updated import
from junk.remove_tags import main as remove_tags_main
from junk.tag_summary import main as summarize_tags_main


def main():
    parser = argparse.ArgumentParser(description="Image Tag Management Tool")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # --tag command
    parser_tag = subparsers.add_parser("tag", help="Tag images in the directory")
    parser_tag.add_argument(
        "--detail-level",
        choices=["low", "high"],
        default="low",
        help="Detail level for tagging (default: low)",
    )
    parser_tag.add_argument(
        "--directory",
        default=".",
        help="Directory containing images (default: current directory)",
    )

    # --remove-tags command
    parser_remove = subparsers.add_parser("remove-tags", help="Remove tags from images")
    parser_remove.add_argument(
        "--directory",
        default=".",
        help="Directory containing images (default: current directory)",
    )

    # --summary command
    parser_summary = subparsers.add_parser("summary", help="Summarize image tags")
    parser_summary.add_argument(
        "--directory",
        default=".",
        help="Directory containing images (default: current directory)",
    )

    args = parser.parse_args()

    if args.command == "tag":
        process_images(args.directory, args.detail_level)
    elif args.command == "remove-tags":
        remove_tags_main()
    elif args.command == "summary":
        summarize_tags_main()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
