export async function onRequestPost({ request, env }) {
  const body = await request.json();

  if (!body.name || !body.data) {
    return new Response("Invalid", { status: 400 });
  }

  const result = await env.DB.prepare(
    "INSERT INTO puzzles (name, data) VALUES (?, ?)"
  )
    .bind(body.name, JSON.stringify(body.data))
    .run();

  return Response.json({ success: true, id: result.meta.last_row_id });
}