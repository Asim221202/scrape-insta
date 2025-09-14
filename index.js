const express = require("express");
const axios = require("axios");

const app = express();

// Health check
app.get("/", (req, res) => {
  res.send("Instagram GraphQL Scraper API is running!");
});

// Helper: username -> userId
async function getUserId(username) {
  const url = `https://www.instagram.com/${username}/?__a=1&__d=dis`;
  const response = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0" }
  });
  if (!response.data?.graphql?.user) throw new Error("Kullanıcı bulunamadı veya JSON değişmiş");
  return response.data.graphql.user.id;
}

// Post + Reel bilgisi API
app.get("/api/posts/:username", async (req, res) => {
  const { username } = req.params;
  try {
    const userId = await getUserId(username);

    // GraphQL query ile post/reel bilgisi
    const queryHash = "58b6785bea111c67129decbe6a448951";
    const variables = {
      id: userId,
      first: 5 // İlk 5 post
    };

    const graphqlUrl = `https://www.instagram.com/graphql/query/?query_hash=${queryHash}&variables=${encodeURIComponent(JSON.stringify(variables))}`;
    const response = await axios.get(graphqlUrl, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const edges = response.data.data.user.edge_owner_to_timeline_media.edges;
    const posts = edges.map(edge => {
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
      posts: posts
    });

  } catch (err) {
    res.status(500).json({ error: "Veri çekilemedi", detail: err.message });
  }
});

// Render port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API is running on port ${PORT}`));
