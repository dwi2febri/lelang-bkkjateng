import {CategoryForm} from "@/features/categories/category-form";
export default async function Page({params}:{params:Promise<{name:string}>}) {
  const {name}=await params;
  return <CategoryForm name={name}/>;
}
