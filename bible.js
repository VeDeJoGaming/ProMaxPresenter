(function (root) {
  'use strict';
  const books = [
    ['Gen','1. Mosebok','1 mos','genesis'],['Exod','2. Mosebok','2 mos','exodus'],['Lev','3. Mosebok','3 mos'],['Num','4. Mosebok','4 mos'],['Deut','5. Mosebok','5 mos'],
    ['Josh','Josva','jos'],['Judg','Dommerne','dom'],['Ruth','Rut'],['1Sam','1. Samuelsbok','1 sam'],['2Sam','2. Samuelsbok','2 sam'],
    ['1Kgs','1. Kongebok','1 kong'],['2Kgs','2. Kongebok','2 kong'],['1Chr','1. Krønikebok','1 krøn'],['2Chr','2. Krønikebok','2 krøn'],
    ['Ezra','Esra'],['Neh','Nehemja','neh'],['Esth','Ester'],['Job','Job'],['Ps','Salmene','sal','psalms'],['Prov','Ordspråkene','ordsp'],
    ['Eccl','Forkynneren','fork'],['Song','Høysangen','høys'],['Isa','Jesaja','jes'],['Jer','Jeremia','jer'],['Lam','Klagesangene','klag'],
    ['Ezek','Esekiel','esek'],['Dan','Daniel','dan'],['Hos','Hosea'],['Joel','Joel'],['Amos','Amos'],['Obad','Obadja'],['Jonah','Jona'],
    ['Mic','Mika'],['Nah','Nahum'],['Hab','Habakkuk'],['Zeph','Sefanja'],['Hag','Haggai'],['Zech','Sakarja','sak'],['Mal','Malaki'],
    ['Matt','Matteus','matthew','matt','mattheus'],['Mark','Markus','mark'],['Luke','Lukas','luk'],['John','Johannes','joh'],['Acts','Apostlenes gjerninger','apg','acts'],
    ['Rom','Romerne','rom'],['1Cor','1. Korinter','1 kor'],['2Cor','2. Korinter','2 kor'],['Gal','Galaterne','gal'],['Eph','Efeserne','ef'],
    ['Phil','Filipperne','fil'],['Col','Kolosserne','kol'],['1Thess','1. Tessaloniker','1 tess'],['2Thess','2. Tessaloniker','2 tess'],
    ['1Tim','1. Timoteus','1 tim'],['2Tim','2. Timoteus','2 tim'],['Titus','Titus','tit'],['Phlm','Filemon','filem'],['Heb','Hebreerne','hebr'],
    ['Jas','Jakob','jak'],['1Pet','1. Peter','1 pet'],['2Pet','2. Peter','2 pet'],['1John','1. Johannes','1 joh'],['2John','2. Johannes','2 joh'],
    ['3John','3. Johannes','3 joh'],['Jude','Judas','jud'],['Rev','Johannes’ åpenbaring','åp','åpenbaringen','revelation']
  ];
  const normalize = text => String(text).normalize('NFKC').toLowerCase().replace(/[.\s’']/g, '');
  const bookOrder=new Map(books.map((book,index)=>[book[1],index]));
  function bookName(value) {
    if (/^\d+$/.test(String(value)) && books[Number(value)-1]) return books[Number(value)-1][1];
    const found = books.find(b => b.some(name => normalize(name) === normalize(value)));
    return found ? found[1] : String(value).trim();
  }
  function csv(text, delimiter) {
    const rows = []; let row = [], cell = '', quoted = false;
    for (let i=0; i<text.length; i++) {
      const c=text[i];
      if (c==='"') { if (quoted && text[i+1]==='"') { cell+='"'; i++; } else quoted=!quoted; }
      else if (!quoted && c===delimiter) { row.push(cell); cell=''; }
      else if (!quoted && c==='\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row=[]; cell=''; }
      else cell+=c;
    }
    if (quoted) throw Error('Unclosed quote in Bible file.');
    if (cell || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
    return rows.filter(r => r.some(v=>v.trim()));
  }
  function parse(text, filename='bible.json') {
    text=text.replace(/^\uFEFF/, '').trim();
    let verses=[], title=filename.replace(/\.[^.]+$/, '');
    if (text.startsWith('{') || text.startsWith('[')) {
      const data=JSON.parse(text); title=data.name || data.title || title;
      if (Array.isArray(data)) verses=data;
      else if (Array.isArray(data.verses)) verses=data.verses;
      else if (Array.isArray(data.books)) {
        for (const book of data.books) for (const [ci,chapter] of (book.chapters || []).entries()) {
          for (const [vi,verse] of (chapter.verses || chapter).entries()) verses.push({book:book.name || book.book,
            chapter:chapter.number || ci+1, verse:verse.number || verse.verse || vi+1, text:typeof verse==='string'?verse:verse.text});
        }
      }
    } else if (text.startsWith('<')) {
      const xml=new DOMParser().parseFromString(text,'application/xml');
      if (xml.querySelector('parsererror')) throw Error('The Bible XML file is invalid.');
      title=xml.querySelector('title')?.textContent || xml.documentElement.getAttribute('biblename') || title;
      if (xml.querySelector('BIBLEBOOK')) {
        for (const book of xml.querySelectorAll('BIBLEBOOK')) for (const chapter of book.querySelectorAll('CHAPTER'))
          for (const verse of chapter.querySelectorAll('VERS')) verses.push({book:book.getAttribute('bname') || book.getAttribute('bnumber'),
            chapter:chapter.getAttribute('cnumber'),verse:verse.getAttribute('vnumber'),text:verse.textContent});
      } else {
        for (const verse of xml.querySelectorAll('verse[osisID]')) {
          const ref=verse.getAttribute('osisID').split(' ')[0].split('.');
          if (verse.textContent.trim()) verses.push({book:ref[0],chapter:ref[1],verse:ref[2],text:verse.textContent});
        }
      }
    } else if (/\.(csv|tsv)$/i.test(filename)) {
      const delimiter=/\.tsv$/i.test(filename)?'\t':text.split('\n')[0].includes(';')?';':',';
      const rows=csv(text,delimiter); const header=rows[0]?.map(v=>v.trim().toLowerCase());
      const fields=['book','chapter','verse','text'];
      const hasHeader=fields.every(f=>header.includes(f));
      for (const row of rows.slice(hasHeader?1:0)) verses.push(Object.fromEntries(fields.map((f,i)=>[f,row[hasHeader?header.indexOf(f):i]])));
    } else {
      for (const line of text.split(/\r?\n/).filter(l=>l.trim())) {
        const match=line.match(/^(.+?)\s+(\d+):(\d+)\s+(.+)$/);
        if (!match) throw Error('Text files need one verse per line: Book 1:1 Verse text.');
        verses.push({book:match[1],chapter:match[2],verse:match[3],text:match[4]});
      }
    }
    if (!verses.length) throw Error('No verses found. Use JSON, CSV, TSV, verse text, OSIS XML or Zefania XML.');
    const seen=new Set();
    verses=verses.map(v=>{
      if (!v || !['string','number'].includes(typeof v.book) || !String(v.book).trim()) throw Error('Every verse needs book, chapter, verse and text.');
      const entry={book:bookName(v.book),chapter:Number(v.chapter),verse:Number(v.verse),text:typeof v.text==='string'?v.text.trim():''};
      if (!entry.book || !Number.isInteger(entry.chapter) || entry.chapter<1 || !Number.isInteger(entry.verse) || entry.verse<1 || !entry.text)
        throw Error('Every verse needs book, chapter, verse and text.');
      const key=`${entry.book}:${entry.chapter}:${entry.verse}`;
      if (seen.has(key)) throw Error('The Bible file contains duplicate verse references.');
      seen.add(key);return entry;
    });
    return {name:String(title),verses};
  }
  const ordered = verses => verses.slice().sort((a,b)=>{
      const order=name=>bookOrder.get(name)??books.length;
      return order(a.book)-order(b.book)||a.chapter-b.chapter||a.verse-b.verse;
    });
  function chapterVerses(bible,verse){return ordered(bible.verses.filter(v=>v.book===verse.book&&v.chapter===verse.chapter));}
  function search(bible,query) {
    query=query.trim(); if (!query) return [];
    const matchingBooks = value => {
      const key=normalize(value);
      const exact=books.find(b=>b.some(name=>normalize(name)===key));
      return exact?[exact]:books.filter(b=>b.some(name=>normalize(name).startsWith(key)));
    };
    const ref=query.match(/^(.+?)\s*(\d+)(?:[:.](\d*)(?:\s*[-–]\s*(\d*))?)?$/);
    if (ref) {
      const matches=matchingBooks(ref[1]), names=new Set(matches.map(b=>normalize(b[1])));
      if(!matches.length)names.add(normalize(bookName(ref[1])));
      return ordered(bible.verses.filter(v=>names.has(normalize(v.book)) && v.chapter===Number(ref[2]) &&
        (!ref[3] || (v.verse>=Number(ref[3]) && v.verse<=Number(ref[4] || ref[3])))));
    }
    const matches=matchingBooks(query);
    if(matches.length){const names=new Set(matches.map(b=>b[1]));return ordered(bible.verses.filter(v=>names.has(v.book)));}
    const terms=query.toLocaleLowerCase('nb').split(/\s+/);
    return bible.verses.filter(v=>terms.every(term=>`${v.book} ${v.text}`.toLocaleLowerCase('nb').includes(term)));
  }
  function formatReference(verses) {
    const ranges=[];
    for(const verse of verses){
      const last=ranges[ranges.length-1];
      if(last&&last.book===verse.book&&last.chapter===verse.chapter&&last.end+1===verse.verse)last.end=verse.verse;
      else ranges.push({book:verse.book,chapter:verse.chapter,start:verse.verse,end:verse.verse});
    }
    return ranges.map(r=>`${r.book} ${r.chapter}:${r.start}${r.end>r.start?'-'+r.end:''}`).join(' · ');
  }
  root.ProMaxBible={parse,search,bookName,formatReference,chapterVerses,ordered};
  if (typeof module!=='undefined') module.exports=root.ProMaxBible;
})(typeof window!=='undefined'?window:globalThis);
