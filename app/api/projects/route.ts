import { neon } from "@neondatabase/serverless";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  try {
    // Check authentication
    const { userId } = await auth();

    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.DATABASE_URL) {
      return Response.json(
        { error: "DATABASE_URL environment variable is not set" },
        { status: 500 },
      );
    }

    const sql = neon(process.env.DATABASE_URL);

    const projects = await sql`
      SELECT
        id,
        project_name,
        location,
        project_type,
        stage,
        stakeholders,
        project_value,
        date_added,
        source_link
      FROM projects
      ORDER BY date_added DESC
    `;

    return Response.json(projects);
  } catch (error) {
    console.error("Database error:", error);
    return Response.json(
      { error: "Failed to fetch projects from database" },
      { status: 500 },
    );
  }
}
