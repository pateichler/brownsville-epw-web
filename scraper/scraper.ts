import {JSDOM} from "jsdom"
import { html } from 'js-beautify';
import fs from 'fs'
import * as path from 'path';

import cliProgress from 'cli-progress';

const BASE_URL = "https://www.brownsvilletx.gov";

const SAVE_PATH = "../site/src/pages/"

// async function saveElementToFile(element: Element, filePath: string) {
//     const text = html(element.outerHTML, { 
//         indent_size: 2
//     });

//     await fs.writeFile(filePath, text, function(err) {
//         if(err){
//             console.error("Error writing to file:", err);
//             throw "Unable to save to file!";
//         }
//     });
// }

async function fetchHTML(url: string) {
   try {
        const response = await fetch(url);
        if (!response.ok)
            throw new Error(`HTTP error! status: ${response.status}`);
 
        const text = await response.text();
        return text;
    } catch (error) {
        console.error("Fetch error:", error);
        throw error;
    }
}

function replaceRelativeLinks(el: Element, baseURL: string){
    const elements = el.querySelectorAll('[href], [src]');

    elements.forEach(e =>{
        for(const attr of ['href', 'src']){
            if(e.hasAttribute(attr)){
                const url = e.getAttribute(attr);
                if(url && url.startsWith("/"))
                    e.setAttribute(attr, baseURL + url);
            }
        }
    })
}

// async function saveWebpageSection(url: string, filePath: string, selector: string){
//     const text = await fetchHTML(url);
//     const dom = new JSDOM(text);
//     const el = dom.window.document.querySelector(selector);
//     if(el === null)
//         throw `No element found with class: ${selector}`;

//     saveElementToFile(el, filePath);
// }

interface Page{
    parent: string | null,
    name: string,
    relURL: string
}

function siteMapHelper(ol: Element, parentName: string | null = null): Page[]{
    const results: Page[] = [];

    const listItems = ol.querySelectorAll(':scope > li');

    listItems.forEach(li => {
        const item = li.querySelector(':scope > .accordionNavItem');
        
        if(item){
            const name = item.querySelector("a")?.textContent;
            const url = item.querySelector("a")?.getAttribute("href");
    
            if (name && url) {
                results.push({
                    parent: parentName,
                    name: name,
                    relURL: url
                });

                const nestedList = li.querySelector(':scope > ol');
                if (nestedList)
                    results.push(...siteMapHelper(nestedList, name));
            }
        }
    });

    return results;
}

async function getSiteMap(baseURL: string, rootPage: Page): Promise<Page[]>{
    const text = await fetchHTML(baseURL + rootPage.relURL);
    const dom = new JSDOM(text);
    const el = dom.window.document.querySelector("#secondaryNav");
    if(el === null)
        throw "Nav bar not found on page!";

    const pages = await siteMapHelper(el.querySelector("ol")!, rootPage.name);
    pages.push(rootPage);
    return pages;
}

async function savePageText(page: Page, pageElement: Element){
    const dir = path.join(SAVE_PATH, page.relURL);
    await fs.promises.mkdir(dir, {recursive: true});

    const filePath = path.join(dir, "/index.html");

    const header: string[] = [];
    header.push("---\neleventyNavigation:");
    header.push(`   key: ${page.name}`);
    if(page.parent)
        header.push(`   parent: ${page.parent}`);
    header.push("---\n");

    const text = header.join("\n") + html(pageElement.innerHTML, { 
        indent_size: 2
    });

    await fs.writeFile(filePath, text, function(err) {
        if(err){
            console.error("Error writing to file:", err);
            throw "Unable to save to file!";
        }
    });
}

async function saveWidget(page: Page, widgetElement: Element){
    const filePath = path.join(SAVE_PATH, page.relURL, "/widget.html");
    const text = html(widgetElement.innerHTML, { 
        indent_size: 2
    });

    await fs.writeFile(filePath, text, function(err) {
        if(err){
            console.error("Error writing to file:", err);
            throw "Unable to save to file!";
        }
    });
}

async function savePage(page: Page, baseURL: string) {
    if(!page.relURL.startsWith("/")){
        return;
    }

    const text = await fetchHTML(BASE_URL + page.relURL);
    const dom = new JSDOM(text);
    const el = dom.window.document.querySelector("#page .pageContent");
    
    if(el){
        replaceRelativeLinks(el, baseURL);
        await savePageText(page, el);
    }
    else        
        throw `Page content could not be found: ${page.name}`;

    const widget = dom.window.document.querySelector("#featureColumn");
    if(widget){
        replaceRelativeLinks(widget, baseURL);
        saveWidget(page, widget);
    }

    console.log(`Saved page: ${page.name}`);
}

async function savePages(baseURL: string, page: Page) {
    const pages = await getSiteMap(baseURL, page);

    for(const page of pages){
        await savePage(page, baseURL);
        await new Promise(resolve => setTimeout(resolve, 500 * Math.random() + 100));
    }
}

const rootPage: Page = {parent: null, name: "Engineering & Public Works", relURL: "/361/Engineering-Public-Works/"};
savePages(BASE_URL, rootPage).then(() => console.log("completed"));