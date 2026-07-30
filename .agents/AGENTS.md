# Project Rules & Guidelines

## Database Migrations & Schema Changes (Production Safety)

To avoid database resets and data loss during production deployments of schema structural changes:

1. **No Destructive Pushes in Production**:
   * NEVER run `npx prisma db push --force-reset` or any destructive db commands in production.
   * `npx prisma db push` is only for rapid local development syncing.

2. **Always Use Prisma Migrations for Structural Changes**:
   * For database changes that require renaming columns or moving relations, generate a migration template:
     `npx prisma migrate dev --name <migration_name> --create-only`
   * This generates the SQL file under `prisma/migrations/` without running it.

3. **Incorporate Data Migration Scripts**:
   * Edit the generated SQL migration file to write custom SQL statements that copy/migrate existing data to the new structure *before* dropping old columns or tables.
   * For example:
     - Create the new column as nullable first.
     - Execute an `UPDATE table SET new_column = old_column` script.
     - Alter the new column to be `NOT NULL` (if required).
     - Drop the old column.

4. **Production Deployment Execution**:
   * In production, always execute changes safely by running:
     `npx prisma migrate deploy`
   * This applies the pre-verified SQL migrations sequentially, preserving data without prompts or resets.
