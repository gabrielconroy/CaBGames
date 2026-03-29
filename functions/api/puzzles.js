export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT id, name, rating, votes FROM puzzles ORDER BY id DESC"
  ).all();

  return Response.json(results);
}