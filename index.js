const express = require("express");
const axios = require("axios");

const app = express();

// Health check
app.get("/", (req, res) => {
  res.send("Instagram Guest Scraper API (Reverse Engineering) is running!");
});

// Helper: fetch profile JSON via guest GraphQL query
async function fetchPosts(username, first = 5) {
  // 1. Guest fetch profile page to get userId
  const profileUrl = `https://www.instagram.com/${username}/`;
  const profileRes = await axios.get(profileUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Cookie": "ig_cb=1"
    }
  });

  // 2. Extract userId from HTML using regex (reverse engineering)
  const idMatch = profileRes.data.match(/"profilePage_([0-9]+)"/);
  if (!idMatch) throw new Error("Kullanıcı ID bulunamadı");

  const userId = idMatch[1];

  // 3. GraphQL query hash for posts
  const queryHash = "58b6785bea111c67129decbe6a448951";
  const variables = { id: userId, first: first };
  const graphqlUrl = `https://www.instagram.com/graphql/query/?query_hash=${queryHash}&variables=${encodeURIComponent(JSON.stringify(variables))}`;

  const graphqlRes = await axios.get(graphqlUrl, {
    headers: { "User-Agent": "Mozilla/5.0", "Cookie": "ig_cb=1" }
  });

  const edges = graphqlRes.data.data.user.edge_owner_to_timeline_media.edges;

  return edges.map(edge => {
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
}

// Post + Reel API
app.get("/api/posts/:username", async (req, res) => {
  const { username } = req.params;
  try {
    const posts = await fetchPosts(username, 5); // ilk 5 post
    res.json({ username, posts });
  } catch (err) {
    res.status(500).json({ error: "Veri çekilemedi", detail: err.message });
  }
});

// Render port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API is running on port ${PORT}`));
