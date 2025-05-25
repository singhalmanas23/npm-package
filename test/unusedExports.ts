// Exported but never used anywhere
export function unusedFunction() {
    console.log("This function is never called");
  }
  
  export const unusedConstant = 42;
  
  export class UnusedClass {
    greet() {
      return "Hello";
    }
  }
  
  // Used export
  export function usedFunction() {
    console.log("I am used!");
  }
  