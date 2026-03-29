export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT id, name, author, rating, votes FROM puzzles ORDER BY id ASC"
  ).all();

  return Response.json(results);
}