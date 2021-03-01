const serial = require('generate-serial-key')
const config = require('../config.js')
const path = require('path')
const { PDFNet } = require('@pdftron/pdfnet-node')
const { degrees, PDFDocument, rgb, StandardFonts } = require('pdf-lib')
let pdf = require('html-pdf')
const fs = require('fs')
const PDFMerger = require('pdf-merger-js')
const fetch = require('node-fetch')
const { guarantee_pack_id_default } = require('../config.js')
const html_to_pdf = require('html-pdf-node')
const hummus = require('hummus');


exports.convertHtmlToPdf = async (url, htmlFile, pdfFile) => {
  try {
    const res = await fetch(url)
    const dest = await fs.createWriteStream(htmlFile)
    await res.body.pipe(dest)
    const html = await fs.readFileSync(htmlFile, 'utf8')
    let options = { format: 'A4' }
    let file = { content: html }
    const pdf = await html_to_pdf.generatePdf(file, options)
    await fs.writeFileSync(pdfFile, pdf)
    return pdfFile
  } catch (error) {
    console.log(error.message)
  }
}

exports.embedPdf = async (templetePdf, pdfFile, embedPdf, config) => {
  try {
    const templete = await PDFDocument.load(fs.readFileSync(templetePdf))
    const pdf = await PDFDocument.load(fs.readFileSync(pdfFile))

    const pdfDoc = await PDFDocument.create()
    const [devisPdf] = await pdfDoc.embedPdf(templete)

    for (var i = 0; i < pdf.getPageCount(); i++) {
      const pdfPdf = await pdfDoc.embedPage(pdf.getPages()[i])
      const page = pdfDoc.addPage()
      const pdfDims = pdfPdf.scale(config.scale)
      page.drawPage(devisPdf)
      page.drawPage(pdfPdf, { ...pdfDims, x: config.x, y: config.y })
    }

    fs.writeFileSync(embedPdf, await pdfDoc.save())

    return embedPdf
  } catch (error) {
    console.log(error.message)
  }
}

exports.mergePdf = async (pdfPages, tmppath) => {
  var merger = new PDFMerger()
  pdfPages.map((pdfPage) => {
    merger.add(pdfPage.pdf, pdfPage.pages)
  })

  await merger.save(tmppath)
}


function strToByteArray(str) {

  var myBuffer = [];
  var buffer = new Buffer.from(str);
  for (var i = 0; i < buffer.length; i++) {
    myBuffer.push(buffer[i]);
  }
  // console.log('debugger', { str, buffer, myBuffer })

  return myBuffer;
}

function findInText({ patterns, string }) {
  for (let pattern of patterns) {
    const match = new RegExp(pattern, 'g').exec(string)
    if (match) {
      if (match[1]) {
        return match[1]
      }
      else {
        return match[0]
      }
    }
  }

  return false
}




exports.replaceText = async (sourceFile, targetFile, cleantPath) => {
  const pdfDoc = await PDFDocument.load(fs.readFileSync(sourceFile))
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const pages = pdfDoc.getPages()
  const firstPage = pages[0]
  const { width, height } = firstPage.getSize()
  console.log('degugger', { width, height })
  firstPage.drawText('This text was added with JavaScript!', {
    x: 110,
    y: height / 2 + 340,
    size: 10,
    font: helveticaFont,
    color: rgb(0.95, 0.1, 0.1),
    // rotate: degrees(-45),
  })

  firstPage.drawText('This text was added with JavaScript!', {
    x: 100,
    y: height / 2 + 250,
    size: 10,
    font: helveticaFont,
    color: rgb(0.95, 0.1, 0.1),
    // rotate: degrees(-45),
  })


  firstPage.drawText('This text was added with JavaScript!', {
    x: 110,
    y: height / 2 + 182,
    size: 10,
    font: helveticaFont,
    color: rgb(0.95, 0.1, 0.1),
    // rotate: degrees(-45),
  })



  fs.writeFileSync(targetFile, await pdfDoc.save())
}

// exports.replaceText = (sourceFile, targetFile, cleantPath) => {
//   var writer = hummus.createWriterToModify(sourceFile, {
//     modifiedFilePath: targetFile
//   });
//   const numPages = writer.createPDFCopyingContextForModifiedFile().getSourceDocumentParser().getPagesCount()
//   var sourceParser = writer.createPDFCopyingContextForModifiedFile().getSourceDocumentParser();
//   var pageObject = sourceParser.parsePage(0);
//   var textObjectID = pageObject.getDictionary().toJSObject().Contents.getObjectID();
//   var textStream = sourceParser.queryDictionaryObject(pageObject.getDictionary(), 'Contents');

//   var data = [];
//   var readStream = sourceParser.startReadingFromStream(textStream);
//   while (readStream.notEnded()) {
//     var readData = readStream.read(10000);
//     data = data.concat(readData);
//   }


//   //create new string
//   let string = new Buffer.from(data).toString();
//   string = string.replace(/ADDR1/g, 'green');

//   console.log(string)


//   //Create and write our new text object
//   var objectsContext = writer.getObjectsContext();
//   objectsContext.startModifiedIndirectObject(textObjectID);

//   var stream = objectsContext.startUnfilteredPDFStream();
//   stream.getWriteStream().write(strToByteArray(string));
//   console.log('debugger', { string })

//   objectsContext.endPDFStream(stream);
//   objectsContext.endIndirectObject();
//   writer.end();
//   // hummus.recrypt(targetFile, cleantPath);

// }

// exports.replaceText = (sourceFile, targetFile, cleantPath) => {
//   const modPdfWriter = hummus.createWriterToModify(sourceFile, { modifiedFilePath: targetFile, compress: false })
//   const numPages = modPdfWriter.createPDFCopyingContextForModifiedFile().getSourceDocumentParser().getPagesCount()
//   for (let page = 0; page < numPages; page++) {
//     const copyingContext = modPdfWriter.createPDFCopyingContextForModifiedFile()
//     const objectsContext = modPdfWriter.getObjectsContext()
//     const pageObject = copyingContext.getSourceDocumentParser().parsePage(page)
//     const textStream = copyingContext.getSourceDocumentParser().queryDictionaryObject(pageObject.getDictionary(), 'Contents')
//     const textObjectID = pageObject.getDictionary().toJSObject().Contents.getObjectID()
//     let data = []
//     const readStream = copyingContext.getSourceDocumentParser().startReadingFromStream(textStream)
//     while (readStream.notEnded()) {
//       const readData = readStream.read(10000)
//       data = data.concat(readData)
//     }
//     const patterns = [/SYNTEC/g]
//     const pdfPageAsString = Buffer.from(data).toString()
//     let toRedactString = findInText({ patterns, string: pdfPageAsString })
//     const redactedPdfPageAsString = pdfPageAsString.replace(new RegExp(toRedactString, 'g'), 'khaled')
//     // Create what will become our new text object
//     objectsContext.startModifiedIndirectObject(textObjectID)

//     const stream = objectsContext.startUnfilteredPDFStream()
//     stream.getWriteStream().write(strToByteArray(redactedPdfPageAsString))
//     objectsContext.endPDFStream(stream)

//     objectsContext.endIndirectObject()

//   }
//   console.log(numPages)

// }




// exports.replaceText = async (inputPath, outputPath, pager, data) => {
//   const pdfDoc = await PDFNet.PDFDoc.createFromFilePath(inputPath)
//   await pdfDoc.initSecurityHandler()
//   const replacer = await PDFNet.ContentReplacer.create()
//   const page = await pdfDoc.getPage(pager)

//   const reader = await PDFNet.ElementReader.create()
//   reader.beginOnPage(page)

//   data.map((data) => {
//     replacer.addString(data.orginaltext, data.newtext)
//   })

//   await replacer.process(page)

//   await pdfDoc.save(outputPath, PDFNet.SDFDoc.SaveOptions.e_linearized)
// }
