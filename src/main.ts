import { Probot } from "probot";
import { bindEvents } from "./bindings";

export default function main(app: Probot) {
  const hello_string = `                                                                                  
  _|    _|  _|_|_|    _|_|_|    _|_|      _|    _|  _|_|_|  _|_|_|_|_|  _|      _|  
  _|    _|  _|    _|    _|    _|    _|    _|    _|    _|        _|        _|  _|    
  _|    _|  _|_|_|      _|    _|  _|_|    _|    _|    _|        _|          _|      
  _|    _|  _|    _|    _|    _|    _|    _|    _|    _|        _|          _|      
    _|_|    _|_|_|    _|_|_|    _|_|  _|    _|_|    _|_|_|      _|          _|      
    
    `;
  console.log(hello_string);
  app.onAny(bindEvents as any);

}
