addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

class ElementHandler {
  element(element) {
    if(element.tagName == 'title') {
      element.setInnerContent('Cloudflare Application Variant')
    } else if(element.tagName == 'h1') {
      element.setInnerContent('Hello Variant')
    } else if(element.tagName == 'p') {
      element.setInnerContent('Congratulations on reaching this page')
    } else if(element.tagName == 'a') {
      element.setInnerContent('Now, go check out Chris\'s personal website...')
      element.setAttribute('href', 'https://crosenblatt.github.io')
    }
  }
}

/**
 * Respond with hello worker text
 * @param {Request} request
 */
async function handleRequest(request) {
  let urlReq = new Request('https://cfw-takehome.developers.workers.dev/api/variants')

  // Fetch the variant urls
  const urlRes = await fetch(urlReq).then(function(res) {
    if(res.status == 200) {
      return res.json()
    } else {
      throw new Error(`${res.status}`)
    }
  }).then(function(json) {
    return json.variants
  })

  var d = new Date()
  var index = null
  let cookie = request.headers.get('Cookie')
  var gotFromCookie = false
  // Try to fetch cookie
  // Very helpful documentation on https://developers.cloudflare.com/workers/templates/pages/cookie_extract/
  if(cookie) {
    let cookies = cookie.split(';')
    cookies.forEach(cookie => {
      let cVal = cookie.split('=')
      if(cVal[0].trim() == 'variant') {
        gotFromCookie = true
        index = parseInt(cVal[1])
      }
    })
  }
  if(index == null) {
    // Works better than Math.random()
    // Also support up to 1000 urls
    index = d.getMilliseconds() % urlRes.length
  }

  let varReq = new Request(urlRes[index])

  // Fetch the page
  const varRes = await fetch(varReq).then(function(res) {
    if(res.status == 200) {
      const elementHandler = new ElementHandler()
      return new HTMLRewriter().on('title', elementHandler)
        .on('h1#title', elementHandler)
        .on('p#description', elementHandler)
        .on('a#url', elementHandler)
        .transform(res)
    } else {
      throw new Error(`${res.status}`)
    }
  }).then(function(pageText) {
    return pageText.text()
  })

  var response = new Response(varRes, {
    headers: { 
      'content-type': 'text/html',
     },
  })

  if(!gotFromCookie) {
    // Extra stuff necessary for Chrome
    response.headers.append('Set-Cookie', 'variant=' + index + '; SameSite=None; Secure')
  }

  return response
}
