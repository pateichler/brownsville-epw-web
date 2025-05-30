import {JSDOM} from "jsdom"
import { html } from 'js-beautify';
import fs from 'fs'
import * as path from 'path';

import cliProgress from 'cli-progress';

const BASE_URL = "https://www.brownsvilletx.gov";

const SAVE_PATH = "../site/src/pages/"

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

interface Page{
    parent: string | null,
    name: string,
    relURL: string,
    order: number
}

function siteMapHelper(ol: Element, parentName: string | null = null): Page[]{
    const results: Page[] = [];

    const listItems = ol.querySelectorAll(':scope > li');
    let order = 0;

    listItems.forEach(li => {
        const item = li.querySelector(':scope > .accordionNavItem');
        
        if(item){
            const name = item.querySelector("a")?.textContent;
            const url = item.querySelector("a")?.getAttribute("href");
    
            if (name && url) {
                results.push({
                    parent: parentName,
                    name: name,
                    relURL: url,
                    order: order
                });

                const nestedList = li.querySelector(':scope > ol');
                if (nestedList)
                    results.push(...siteMapHelper(nestedList, name));
            }
        }
        
        order += 1;
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

function saveFileHandler(err: NodeJS.ErrnoException | null){
    if(err){
        console.error("Error writing to file:", err);
        throw "Unable to save to file!";
    }
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
    header.push(`   order: ${page.order}`);
    header.push("---\n");

    const text = header.join("\n") + html(pageElement.innerHTML, { 
        indent_size: 2
    });

    await fs.writeFile(filePath, text, saveFileHandler);
}

async function saveWidget(page: Page, widgetElement: Element){
    const filePath = path.join(SAVE_PATH, page.relURL, "/widget.html");
    const text = html(widgetElement.innerHTML, { 
        indent_size: 2
    });

    await fs.writeFile(filePath, text, saveFileHandler);
}

async function saveNavLink(page: Page){
    const dir = path.join(SAVE_PATH, "links/", page.relURL);
    await fs.promises.mkdir(dir, {recursive: true});

    //TODO: In future use different file extension like .link
    const filePath = path.join(dir, `${page.name}.html`);

    const header: string[] = [];
    header.push("---\neleventyNavigation:");
    header.push(`   key: ${page.name}`);
    header.push(`   url: ${page.relURL}`);
    if(page.parent)
        header.push(`   parent: ${page.parent}`);
    header.push(`   order: ${page.order}`);
    header.push("permalink: false");
    header.push("---\n");

    await fs.writeFile(filePath, header.join("\n"), saveFileHandler);
}

async function savePage(page: Page, baseURL: string) {
    if(!page.relURL.startsWith("/")){
        saveNavLink(page);
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

    const hasWidget = (dom.window.document.querySelector("#pageShowFeatureColumn") as HTMLInputElement).value.toLowerCase() === "true";
    const widget = dom.window.document.querySelector("#featureColumn");
    if(hasWidget && widget){
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

const rootPage: Page = {parent: null, name: "Engineering & Public Works", relURL: "/361/Engineering-Public-Works/", order: 0};
savePages(BASE_URL, rootPage).then(() => console.log("completed"));