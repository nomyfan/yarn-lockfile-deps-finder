const fs = require("fs");
const path = require("path");
const lockfile = require("@yarnpkg/lockfile");
const config = require(path.resolve(__dirname, "finder.config.js"));

main();

function parseLockfileToJson(filepath) {
  const file = fs.readFileSync(filepath, "utf-8");
  const json = lockfile.parse(file);

  if (json.type !== "success") {
    throw new Error("Didn't return with success");
  }
  return json;
}

function main() {
  const { object } = parseLockfileToJson(path.resolve(config.yarnlock));
  const exclude = config.exclude || [];

  /**
   * @type {{[index: string]: string[]}}
   */
  const deps = {};

  const entry = object[config.entry];
  if (!entry) {
    console.error("Cannot find the target entry");
    return;
  }

  const list = [entry];
  while (list.length) {
    const head = list.shift();
    if (!head.dependencies) continue;
    const dependencies = Object.entries(head.dependencies);
    dependencies
      .filter(([dep, ver]) => {
        for (const ex of exclude) {
          if (ex.test(`${dep}@${ver}`)) {
            return false;
          }
        }

        return true;
      })
      .forEach(([dep, ver]) => {
        const versions = deps[dep] || [];
        if (versions.indexOf(ver) === -1) {
          versions.push(ver);
        }
        deps[dep] = versions;

        const nextEntry = object[`${dep}@${ver}`];
        if (!nextEntry) {
          throw new Error(`We should find the dependency entry ${dep}@${ver}`);
        }
        list.push(nextEntry);
      });
  }

  fs.writeFileSync(
    config.output || path.resolve(__dirname, "output.json"),
    JSON.stringify(deps, null, 2),
    "utf-8",
  );
}
