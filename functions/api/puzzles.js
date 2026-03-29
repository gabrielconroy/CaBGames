export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT id, name, author, size, rating, votes, created_at FROM puzzles ORDER BY id DESC"
  ).all();

  return Response.json(results);
}