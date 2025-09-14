const express = require("express");
const puppeteer = require("puppeteer");

const app = express();

app.get("/", (req, res) => {
  res.send("Instagram Puppeteer Scraper API is running!");
});

app.get("/api/post", async (req, res) => {
  const { url } = req.query; // ?url=https://www.instagram.com/p/SHORTCODE/
  if (!url) return res.status(400).json({ error: "url parametresi gerekli" });

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();

    // Guest cookie veya bot login ekleyebilirsin
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");

    await page.goto(url, { waitUntil: "networkidle2" });

    // Post/reel verilerini sayfa context’inde al
    const data = await page.evaluate(() => {
      const jsonScript = Array.from(document.querySelectorAll('script[type="text/javascript"]'))
        .find(s => s.textContent.includes("shortcode_media"));
      if (!jsonScript) return null;

      const match = jsonScript.textContent.match(/window\._sharedData = (.*);/);
      const json = match ? JSON.parse(match[1]) : null;
      const media = json?.entry_data?.PostPage?.[0]?.graphql?.shortcode_media;
      return media ? {
        id: media.id,
        type: media.is_video ? "reel/video" : "image",
        caption: media.edge_media_to_caption.edges[0]?.node.text || "",
        thumbnail: media.display_url,
        shortcode: media.shortcode,
        url: window.location.href,
        video_url: media.is_video ? media.video_url : null,
        likes: media.edge_media_preview_like?.count || media.edge_liked_by?.count || 0,
        comments: media.edge_media_to_parent_comment?.count || media.edge_media_to_comment?.count || 0
      } : null;
    });

    if (!data) throw new Error("Video bilgisi bulunamadı");

    res.json(data);

  } catch (err) {
    res.status(500).json({ error: "Veri çekilemedi", detail: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

// Render port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API is running on port ${PORT}`));
