import { Probot } from "probot";
import { bindEvents } from "./bindings";
import "source-map-support/register";
// import { callbackOnAny } from "./utils/callbackOnAny";

export default function main(app: Probot) {
  const hello_string = `                                                                                  
  _|    _|  _|_|_|    _|_|_|    _|_|      _|    _|  _|_|_|  _|_|_|_|_|  _|      _|  
  _|    _|  _|    _|    _|    _|    _|    _|    _|    _|        _|        _|  _|    
  _|    _|  _|_|_|      _|    _|  _|_|    _|    _|    _|        _|          _|      
  _|    _|  _|    _|    _|    _|    _|    _|    _|    _|        _|          _|      
    _|_|    _|_|_|    _|_|_|    _|_|  _|    _|_|    _|_|_|      _|          _|      
    
    `;
  console.log(hello_string);
  // @ts-ignore-error
  app.onAny(bindEvents);
}
