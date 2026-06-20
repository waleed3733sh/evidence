module.exports = async function health(req, res) {
  const body = JSON.stringify({
    ok: true,
    name: "teacher-evidence-app",
    runtime: "vercel",
    env: {
      SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      SUPABASE_BUCKET: Boolean(process.env.SUPABASE_BUCKET)
    }
  });

  res.statusCode = 200;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(body);
};
