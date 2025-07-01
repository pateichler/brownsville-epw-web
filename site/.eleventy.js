import eleventyNavigationPlugin from "@11ty/eleventy-navigation";
import fs from "fs";
import path from "path";

export const config = {
  dir: {
    input: "src",
    output: "../public",
    includes: "_includes",
  }
};

export default function(eleventyConfig){
  eleventyConfig.addPlugin(eleventyNavigationPlugin);
  
  eleventyConfig.addPassthroughCopy({"src/style": "/"});
  eleventyConfig.addPassthroughCopy({"src/js": "/"});
  eleventyConfig.addPassthroughCopy({"src/attachments/*.pdf": "/attachments/"});

  eleventyConfig.addFilter("isRelativeURL", function(url){
    return url.startsWith("/");
  });

  eleventyConfig.addFilter("isRelativeFile", function(relPath){
    const inputPath = this.page?.inputPath;
    if (!inputPath) 
      return false;

    const baseDir = path.dirname(inputPath);
    const fullPath = path.resolve(baseDir, relPath);

    if(fs.existsSync(fullPath))
      return fullPath;
    
    return undefined;
  });
}