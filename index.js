const express = require("express");
const axios = require("axios");

const app = express();

// Post + Reel bilgisi
app.get("/api/posts/:username", async (req, res) => {
  const { username } = req.params;
  try {
    // Kullanıcı profil sayfasını çek
    const response = await axios.get(`https://www.instagram.com/${username}/`);
    const sharedData = response.data.match(/window\._sharedData = (.*?);<\/script>/);

    if (!sharedData) return res.status(404).json({ error: "Veri bulunamadı" });

    const data = JSON.parse(sharedData[1]);
    const edges = data.entry_data.ProfilePage[0].graphql.user.edge_owner_to_timeline_media.edges;

    // İlk 5 post için detaylı bilgi çekelim (fazla istek atmamak için limit)
    const posts = await Promise.all(edges.slice(0, 5).map(async (edge) => {
      const shortcode = edge.node.shortcode;
      const postUrl = `https://www.instagram.com/p/${shortcode}/`;

      try {
        const postRes = await axios.get(postUrl);
        const postDataMatch = postRes.data.match(/window\._sharedData = (.*?);<\/script>/);
        const postData = JSON.parse(postDataMatch[1]);
        const media = postData.entry_data.PostPage[0].graphql.shortcode_media;

        return {
          id: media.id,
          type: media.is_video ? "reel/video" : "image",
          caption: media.edge_media_to_caption.edges[0]?.node.text || "",
          thumbnail: media.display_url,
          shortcode: shortcode,
          url: postUrl,
          video_url: media.is_video ? media.video_url : null,
          likes: media.edge_media_preview_like.count,
          comments: media.edge_media_to_parent_comment.count
        };
      } catch (err) {
        return { error: "Post detay alınamadı", shortcode };
      }
    }));

    res.json({
      username: username,
      posts: posts
    });

  } catch (err) {
    res.status(500).json({ error: "Veri çekilemedi", detail: err.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`API http://localhost:${PORT} üzerinde çalışıyor`));
