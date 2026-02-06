import { useQuery } from "@tanstack/react-query";
import { getUserFriends } from "@/shared/lib/api";
import Layout from "./Layout";

const LayoutWithSidebar = ({ children }) => {
  const { data: friends = [] } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
  });

  return (
    <Layout showSidebar={true} friends={friends}>
      {children}
    </Layout>
  );
};

export default LayoutWithSidebar;
