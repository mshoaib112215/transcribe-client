export function updateGetTransRes(obj) {
    // Create a map to store book_id to book_name mappings
    let newObj = [];
    obj.forEach((o1) => {
        

        obj.forEach((o2) => {
            if ("book_id" in o1 && "book_row_id" in o2 && o1.book_id == o2.book_row_id) {
                newObj.push({ ...o1, ...o2 });
            }
        })
    })
    
    return newObj;
}
