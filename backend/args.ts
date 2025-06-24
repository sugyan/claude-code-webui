import { Command } from "@cliffy/command";

export interface ParsedArgs {
  debug: boolean;
  port: number;
  host: string;
}

export async function parseCliArgs(): Promise<ParsedArgs> {
  // Read version from VERSION file
  let version = "unknown";
  try {
    const versionContent = await Deno.readTextFile(
      import.meta.dirname + "/VERSION",
    );
    version = versionContent.trim();
  } catch (error) {
    console.error(
      `Error reading VERSION file: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    Deno.exit(1);
  }

  const { options } = await new Command()
    .name("claude-code-webui")
    .version(version)
    .description("Claude Code Web UI Backend Server")
    .option("-p, --port <port:number>", "Port to listen on", {
      default: parseInt(Deno.env.get("PORT") || "8080", 10),
    })
    .option(
      "--host <host:string>",
      "Host address to bind to (use 0.0.0.0 for all interfaces)",
      {
        default: "127.0.0.1",
      },
    )
    .option("-d, --debug", "Enable debug mode")
    .env("DEBUG=<enable:boolean>", "Enable debug mode")
    .parse(Deno.args);

  return {
    debug: options.debug || false,
    port: options.port,
    host: options.host,
  };
}
