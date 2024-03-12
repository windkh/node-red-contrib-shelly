// This block must be configured by the one who creates the skript
let CONFIG = {
    URL: '%URL%',
    SENDER: '%SENDER%'
};

if(CONFIG.SENDER === ''){
    Shelly.call(
        'Shelly.GetStatus',''
        function (res, error_code, error_msg, ud) {
           let status = res;
           // print(JSON.stringify(status));
           
           CONFIG.SENDER = status.wifi.sta_ip;
           print('SENDER = ' + CONFIG.SENDER);
        },
        null
    );
}  
  
Shelly.addEventHandler(
   function (event, userdata) {
           if (typeof event.info.event !== 'undefined') {
               let eventType = event.info.event;
               if(eventType !== 'power_update' && eventType !== 'current_update' &&
                  eventType !== 'btn_up' && eventType !== 'btn_down'){
                   CallNodeRed(event)
               }
           }
           else{
              return true;
          }
      },
      null
  );

function CallNodeRed(event) {
   print('CallNodeRed: ' + JSON.stringify(event));
                   
   let data = {
       event: event,
       sender : CONFIG.SENDER
   };
   
   let body = JSON.stringify(data );
   Shelly.call(
      'http.request', {
          method: 'PUT',
          url: CONFIG.URL,
          body: body
       },
       function (r, e, m) {
       },
       null
  );
}
