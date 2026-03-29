export async function onRequestPost(context) {

  const db = context.env.DB;

  const body = await context.request.json();

  const data = JSON.stringify(body.data);
  const author = body.author || "Anonymous";

  // 🔥 Auto-numbering
  const countRes = await db.prepare("SELECT COUNT(*) as count FROM puzzles").first();
  const nextNumber = (countRes?.count || 0) + 1;

  const name = `Puzzle #${nextNumber}`;

  const result = await db.prepare(`
    INSERT INTO puzzles (name, author, data, rating, votes)
    VALUES (?, ?, ?, 0, 0)
  `)
  .bind(name, author, data)
  .run();

  return new Response(JSON.stringify({
    success: true,
    id: result.meta.last_row_id
  }), {
    headers: { "Content-Type": "application/json" }
  });
}