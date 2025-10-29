import { promises as fs } from "fs";
import { extract } from '@extractus/feed-extractor'

const RSS_URL = "https://www.oluwasetemi.dev/rss.xml";

const DEFAULT_N = 6;

type Entry = {
  title?: string;
  description?: string;
  link?: string;
  categories?: string[];
  published?: string;
};

const fetchFeed = async (retries = 3, delay = 2000): Promise<string[]> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Attempt ${attempt} of ${retries} to fetch RSS feed...`);

      const data = await extract(RSS_URL, undefined, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive'
        },
      }) ?? { entries: [] };

      let feeds = [];

      for (const item of data?.entries ?? []) {
        if (item.title && item.link) feeds.push(formatFeedEntry(item));
        if (feeds.length === DEFAULT_N) break;
      }

      console.log(`Successfully fetched ${feeds.length} feeds`);
      return feeds;
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);

      if (attempt < retries) {
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error("All retry attempts failed. Could not fetch feed.");
      }
    }
  }

  return [];
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

const formatFeedEntry = ({ title, link, published }: Entry): string => {
  const isoDate = published ? new Date(published).toISOString().slice(0, 10) : "";

  // convert to relative date
  const relativeDate = getRelativeDate(isoDate);

  return published ? `[${title}](${link}) - ${relativeDate}` : `[${title}](${link})`;
};

function replaceChunk(content: string, marker: string, chunk: string, inline: boolean = false,): string {
  const startMarker = `<!-- ${marker} start -->`;
  const endMarker = `<!-- ${marker} end -->`;

  const pattern = new RegExp(`${startMarker}[\\s\\S]*${endMarker}`, "g");

  if (!inline) {
    chunk = `\n${chunk}\n`;
  }

  return content.replace(pattern, `${startMarker}${chunk}${endMarker}`);
};

const updateReadme = async (): Promise<void> => {
  try {
    const feeds = await fetchFeed();

    if (feeds.length === 0) {
      console.warn("No feeds fetched. Skipping README update.");
      return;
    }

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
