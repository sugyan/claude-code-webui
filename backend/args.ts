import { parseArgs } from "@std/cli/parse-args";

export interface ParsedArgs {
  help: boolean;
  version: boolean;
  debug: boolean;
  port: string;
  host: string;
}

export function parseCliArgs(): ParsedArgs {
  const args = parseArgs(Deno.args, {
    boolean: ["help", "version", "debug"],
    string: ["port", "host"],
    alias: {
      "help": "h",
      "version": "v",
      "port": "p",
      "debug": "d",
      "host": "H",
    },
    default: {
      port: Deno.env.get("PORT") || "8080", // Use PORT env var if available, fallback to CLI arg or default
      host: "127.0.0.1", // Default to localhost only
    },
  });

  return {
    help: args.help,
    version: args.version,
    debug: args.debug,
    port: args.port as string,
    host: args.host as string,
  };
}

export function showHelp(): void {
  console.log("Claude Code Web UI Backend Server");
  console.log("");
  console.log("Usage: deno run main.ts [options]");
  console.log("");
  console.log("Options:");
  console.log("  -p, --port <number>   Port to listen on (default: 8080)");
  console.log(
    "  -H, --host <address>  Host address to bind to (default: 127.0.0.1)",
  );
  console.log(
    "  -d, --debug          Enable debug mode (also via DEBUG=true env var)",
  );
  console.log("  -h, --help           Show this help message");
  console.log("  -v, --version        Show version information");
}

export async function showVersion(): Promise<void> {
  try {
    // Use import.meta.dirname to access embedded VERSION file
    const version = await Deno.readTextFile(import.meta.dirname + "/VERSION");
    console.log(`Claude Code Web UI Backend ${version.trim()}`);
  } catch (error) {
    console.error(
      `Error reading VERSION file: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    Deno.exit(1);
  }
}

export function validatePort(portString: string): number {
  const port = parseInt(portString, 10);

  if (isNaN(port) || port < 1 || port > 65535) {
    console.error("Error: Port must be a valid number between 1 and 65535");
    Deno.exit(1);
  }

  return port;
}

export function isDebugMode(args: ParsedArgs): boolean {
  return args.debug || Deno.env.get("DEBUG") === "true";
}
