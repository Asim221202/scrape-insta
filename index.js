const express = require("express");
const axios = require("axios");

const app = express();

app.get("/", (req, res) => {
  res.send("Instagram Post Scraper API is running!");
});

app.get("/api/post", async (req, res) => {
  const { url } = req.query; // ?url=https://www.instagram.com/p/SHORTCODE/
  if (!url) return res.status(400).json({ error: "url parametresi gerekli" });

  try {
    // HTML fetch
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Cookie": "ig_cb=1"
      }
    });
    const html = response.data;

    // Embed JSON parse
    const match = html.match(/<script type="text\/javascript">window\._sharedData = (.*);<\/script>/)
               || html.match(/<script type="text\/javascript">window\.__additionalDataLoaded\('feed', (.*)\);<\/script>/);
    if (!match) throw new Error("Embed JSON bulunamadı");

    const json = JSON.parse(match[1]);
    // Shortcode media JSON’u
    const media = json.entry_data?.PostPage?.[0]?.graphql?.shortcode_media
              || json?.graphql?.shortcode_media;

    if (!media) throw new Error("Video bilgisi bulunamadı");

    res.json({
      id: media.id,
      type: media.is_video ? "reel/video" : "image",
      caption: media.edge_media_to_caption.edges[0]?.node.text || "",
      thumbnail: media.display_url,
      shortcode: media.shortcode,
      url: url,
      video_url: media.is_video ? media.video_url : null,
      likes: media.edge_media_preview_like?.count || media.edge_liked_by?.count || 0,
      comments: media.edge_media_to_parent_comment?.count || media.edge_media_to_comment?.count || 0
    });

  } catch (err) {
    res.status(500).json({ error: "Veri çekilemedi", detail: err.message });
  }
});

// Render port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API is running on port ${PORT}`));
