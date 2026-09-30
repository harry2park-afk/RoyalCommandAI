// One contract for the button editor and saved appearance validation.
export const appearanceLimits = {
 borderWidth: {min:0,max:10,default:0},
 radius: {min:0,max:50,default:12},
 fontSize: {min:10,max:48,default:16},
} as const;
