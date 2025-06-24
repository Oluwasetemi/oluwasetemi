import { promises as fs } from "fs";
import rssParser from "rss-parser";

const DEFAULT_N = 6;

type Entry = {
  title?: string;
  description?: string;
  link?: string;
  pubDate?: string;
  categories?: string[];
};

const fetchFeed = async (url: string): Promise<string[]> => {
  try {
    const parser = new rssParser();
    const response = await parser.parseURL(url);
    let feeds = [];

    for (const item of response.items) {
      if (item.title && item.link) feeds.push(formatFeedEntry(item));
      if (feeds.length === DEFAULT_N) break;
    }

    return feeds;
  } catch (error) {
    console.error("Error fetching or parsing the feed:", error);
    return [];
  }
};

function getRelativeDate(isoDate: string) {
  const date = new Date(isoDate);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();

  const days = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years >= 1) {
    return years === 1 ? 'last year' : `${years} years ago`;
  } else if (months >= 1) {
    return months === 1 ? 'last month' : `${months} months ago`;
  } else if (days >= 7) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? 'last week' : `${weeks} weeks ago`;
  } else if (days > 0) {
    return days === 1 ? 'yesterday' : `${days} days ago`;
  } else {
    return 'today';
  }
}

const formatFeedEntry = ({ title, link, pubDate }: Entry): string => {
  const isoDate = pubDate ? new Date(pubDate).toISOString().slice(0, 10) : "";

  // convert to relative date
  const relativeDate = getRelativeDate(isoDate);

  return pubDate ? `[${title}](${link}) - ${relativeDate}` : `[${title}](${link})`;
};

const replaceChunk = (
  content: string,
  marker: string,
  chunk: string,
  inline: boolean = false,
): string => {
  const startMarker = `<!-- ${marker} start -->`;
  const endMarker = `<!-- ${marker} end -->`;

  const pattern = new RegExp(`${startMarker}[\\s\\S]*${endMarker}`, "g");

  if (!inline) {
    chunk = `\n${chunk}\n`;
  }

  return content.replace(pattern, `${startMarker}${chunk}${endMarker}`);
};

const updateReadme = async (): Promise<void> => {
  const url = "https://www.oluwasetemi.dev/rss.xml";

  try {
    const feeds = await fetchFeed(url);
    const readmePath = `${process.cwd()}/README.md`;
    let readmeContent = await fs.readFile(readmePath, "utf-8");
    readmeContent = replaceChunk(readmeContent, "blog", feeds.join("\n\n"));
    await fs.writeFile(readmePath, readmeContent, "utf-8");
    console.info("README.md updated successfully!");
  } catch (error) {
    console.error("Error updating README.md:", error);
  }
};

await updateReadme();
