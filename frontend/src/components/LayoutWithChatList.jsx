import { useQuery } from "@tanstack/react-query";
import { getUserFriends } from "../lib/api";
import Layout from "./Layout";

const LayoutWithChatList = ({ children }) => {
  const { data: friends = [] } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
  });

  return (
    <Layout showChatList={true} friends={friends}>
      {children}
    </Layout>
  );
};

export default LayoutWithChatList;
