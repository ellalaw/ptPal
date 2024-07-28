export async function GET() {
  const data = {
      "name": "ella1",
      "email": "example@test.com",
      "info1": "a",
      "info2": "b",
      "info3": "c"
  }
  console.log("in routes u-p");
  return Response.json(data)
}