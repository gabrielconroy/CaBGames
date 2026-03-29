export async function onRequestPost({ request, env }) {
  const { id, rating } = await request.json();

  const puzzle = await env.DB.prepare(
    "SELECT rating, votes FROM puzzles WHERE id=?"
  ).bind(id).first();

  if (!puzzle) {
    return new Response("Not found", { status: 404 });
  }

  const newVotes = puzzle.votes + 1;
  const newRating =
    (puzzle.rating * puzzle.votes + rating) / newVotes;

  await env.DB.prepare(
    "UPDATE puzzles SET rating=?, votes=? WHERE id=?"
  )
    .bind(newRating, newVotes, id)
    .run();

  return Response.json({ success: true });
}