export async function onRequestPost(context) {
  const db = context.env.DB;
  const body = await context.request.json();
  const data = JSON.stringify(body.data);
  const author = body.author || "Anonymous";

  // Derive size from data (e.g. "5x5")
  const cats = body.data;
  const N = Object.keys(cats).length;
  const M = cats[Object.keys(cats)[0]].length;
  const size = `${N}x${M}`;

  // Auto-numbering
  const countRes = await db.prepare("SELECT COUNT(*) as count FROM puzzles").first();
  const nextNumber = (countRes?.count || 0) + 1;
  const name = `Puzzle #${nextNumber}`;

  const result = await db.prepare(`
    INSERT INTO puzzles (name, author, data, rating, votes, size)
    VALUES (?, ?, ?, 0, 0, ?)
  `)
  .bind(name, author, data, size)
  .run();

  return new Response(JSON.stringify({
    success: true,
    id: result.meta.last_row_id
  }), {
    headers: { "Content-Type": "application/json" }
  });
}