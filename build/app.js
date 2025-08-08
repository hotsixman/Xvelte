import r from"express";import{_ as n}from"./assets/c00d3009d37f6469e5f31eea181eb0044514c5c9f45e88751f0a753f91a29787-Du8wq7Vf.js";import{render as m}from"svelte/server";import s from"node:path";import"./assets/acbc4a114ec727631b5aa1a4e936d7ad8237ad5fa8eba41de39910ab097b34e8-C0CoA8_l.js";import"./assets/6e7db016471023e8ea49d01035e8a671188fa39effa81a7cf47908b0cc56b518-n7nuNn2B.js";const e=r();e.use("/__client__",r.static(s.resolve(import.meta.dirname,"__client__")));e.get("/",async(i,t)=>{const o=m(n);return t.setHeader("content-type","text/html"),t.end(`
    <!DOCTYPE html>
    <html lang="ko">
        <head>
            <meta charset="UTF-8">
            <script src="/__client__/svelte.js" type="module"><\/script>
            ${o.head}
        </head>
        <body>
            ${o.body}
        </body>
    </html>    
    `)});e.listen(3e3,()=>console.log("listen on 3000"));
