const express = require("express");
const axios = require("axios");

const app = express();

// Health check
app.get("/", (req, res) => {
  res.send("Instagram Guest Scraper API is running!");
});

// Helper: fetch profile page
async function fetchProfileHTML(username) {
  const url = `https://www.instagram.com/${username}/`;
  const response = await axios.get(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "Accept-Language": "en-US,en;q=0.9",
      "Cookie": "ig_cb=1" // guest cookie
    }
  });
  return response.data;
}

// Helper: parse JSON from HTML
function parseSharedData(html) {
  const match = html.match(/<script type="text\/javascript">window\._sharedData = (.*);<\/script>/);
  if (!match) throw new Error("Embed JSON bulunamadı");
  const json = JSON.parse(match[1]);
  return json;
}

// Post + Reel bilgisi API
app.get("/api/posts/:username", async (req, res) => {
  const { username } = req.params;
  try {
    const html = await fetchProfileHTML(username);
    const sharedData = parseSharedData(html);

    const user = sharedData.entry_data.ProfilePage[0].graphql.user;
    const edges = user.edge_owner_to_timeline_media.edges;

    // İlk 5 post/reel
    const posts = edges.slice(0, 5).map(edge => {
      const media = edge.node;
      return {
        id: media.id,
        type: media.is_video ? "reel/video" : "image",
        caption: media.edge_media_to_caption.edges[0]?.node.text || "",
        thumbnail: media.display_url,
        shortcode: media.shortcode,
        url: `https://www.instagram.com/p/${media.shortcode}/`,
        video_url: media.is_video ? media.video_url : null,
        likes: media.edge_liked_by.count,
        comments: media.edge_media_to_comment.count
      };
    });

    res.json({
      username: username,
      profilePic: user.profile_pic_url_hd,
      posts: posts
    });

  } catch (err) {
    res.status(500).json({ error: "Veri çekilemedi", detail: err.message });
  }
});

// Render port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API is running on port ${PORT}`));
