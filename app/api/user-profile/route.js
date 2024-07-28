export async function GET() {
    const data = {
        "name": "ella2",
        "email": "example@test.com",
        "info1": "aa",
        "info2": "bb",
        "info3": "cc"
    }
    console.log("in api u-p");
    return Response.json(data)
}