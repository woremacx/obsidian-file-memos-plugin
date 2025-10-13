# Tickets Directory

This directory contains all the ticket files for the project.

## Important Guidelines

**⚠️ Always use ticket.sh commands to manage tickets:**

- **Create new tickets:** `bash ./ticket.sh new <slug>`
- **Start working on a ticket:** `bash ./ticket.sh start <ticket-name>`
- **Complete a ticket:** `bash ./ticket.sh close`

**❌ DO NOT manually merge feature branches to the default branch!**
The `bash ./ticket.sh close` command handles merging and cleanup automatically.

## Directory Structure

- Active tickets: `*.md` files in this directory
- Completed tickets: `done/` subdirectory (created automatically)

## Getting Help

For detailed usage instructions, run:
```bash
bash ./ticket.sh help
```

For a list of all available commands:
```bash
bash ./ticket.sh --help
```
