var client;
var freshdeskapi = btoa('');

init();

async function init() {
  client = await app.initialized();
  client.events.on('app.activated', renderText);
}


function jsonEscape(str)  {
  return str.replace(/\n/g, " ").replace(/\\/g," ");
}

function fixJSON(json){
  function bulkRegex(str, callback){
      if(callback && typeof callback === 'function'){
          return callback(str);
      }else if(callback && Array.isArray(callback)){
          for(let i = 0; i < callback.length; i++){
              if(callback[i] && typeof callback[i] === 'function'){
                  str = callback[i](str);
              }else{break;}
          }
          return str;
      }
      return str;
  }
  if(json && json !== ''){
      if(typeof json !== 'string'){
          try{
              json = JSON.stringify(json);
          }catch(e){return false;}
      }
      if(typeof json === 'string'){
          json = bulkRegex(json, false, [
              str => str.replace(/[\n\t]/gm, ''),
              str => str.replace(/,\}/gm, '}'),
              str => str.replace(/,\]/gm, ']'),
              str => {
                  str = str.split(/(?=[,\}\]])/g);
                  str = str.map(s => {
                      if(s.includes(':') && s){
                          let strP = s.split(/:(.+)/, 2);
                          strP[0] = strP[0].trim();
                          if(strP[0]){
                              let firstP = strP[0].split(/([,\{\[])/g);
                              firstP[firstP.length-1] = bulkRegex(firstP[firstP.length-1], false, p => p.replace(/[^A-Za-z0-9\-_]/, ''));
                              strP[0] = firstP.join('');
                          }
                          let part = strP[1].trim();
                          if((part.startsWith('"') && part.endsWith('"')) || (part.startsWith('\'') && part.endsWith('\'')) || (part.startsWith('`') && part.endsWith('`'))){
                              part = part.substr(1, part.length - 2);
                          }
                          part = bulkRegex(part, false, [
                              p => p.replace(/(["])/gm, '\\$1'),
                              p => p.replace(/\\'/gm, '\''),
                              p => p.replace(/\\`/gm, '`'),
                          ]);
                          strP[1] = ('"'+part+'"').trim();
                          s = strP.join(':');
                      }
                      return s;
                  });
                  return str.join('');
              },
              str => str.replace(/(['"])?([a-zA-Z0-9\-_]+)(['"])?:/g, '"$2":'),
              str => {
                  str = str.split(/(?=[,\}\]])/g);
                  str = str.map(s => {
                      if(s.includes(':') && s){
                          let strP = s.split(/:(.+)/, 2);
                          strP[0] = strP[0].trim();
                          if(strP[1].includes('"') && strP[1].includes(':')){
                              let part = strP[1].trim();
                              if(part.startsWith('"') && part.endsWith('"')){
                                  part = part.substr(1, part.length - 2);
                                  part = bulkRegex(part, false, p => p.replace(/(?<!\\)"/gm, ''));
                              }
                              strP[1] = ('"'+part+'"').trim();
                          }
                          s = strP.join(':');
                      }
                      return s;
                  });
                  return str.join('');
              },
          ]);
          try{
              json = JSON.parse(json);
          }catch(e){return false;}
      }
      return json;
  }
  return false;
}

async function renderText() {
  const textElement = document.getElementById('apptext');
  try {
    const ticketData1 = await client.data.get('ticket');
    const {
      ticket: { id }
    } = ticketData1;
    let resp2 = await client.request.invokeTemplate("convos", {
      "context": {
        "ticket_id": id,
        "apikey": freshdeskapi
      }
    });
    var rep_json2 = fixJSON(resp2.response);
    const ticketData = await client.data.get('ticket');
    const {
      ticket: { description_text }
    } = ticketData;
    var freshconvo = " ";
    for (var i = 0; i < rep_json2.length; i++) {
      var json = rep_json2[i];
      var bodyText = json.body_text;
      if(json.incoming){
        freshconvo += "Customer: " + bodyText +"\n";
      }
      else{
        freshconvo += "Agent: " + bodyText +"\n";
      }
      
    };
    let resp = await client.request.invokeTemplate("getchat", {
      "context": {},
      "body": JSON.stringify({
        "model": "gpt-3.5-turbo",
        "messages": [{"role": "system", "content": "You are a helpful assistant."}, 
        {"role": "user", "content":  "Customer: " + description_text + "\n"+ freshconvo + "\nProvide Sentiment /10"}
        ]
        })
    });
    var rep_json = fixJSON(resp.response);
    var rep2 = rep_json.choices[0].message.content;
    textElement.innerHTML = rep2;

  }
  catch(err){
    textElement.innerHTML = "Error request fail: " + JSON.stringify(err);
  }

}
