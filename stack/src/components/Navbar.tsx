import React from "react";
import { Button } from "./ui/button";
import { Image, Menu } from "lucide-react";
import Link from "next/link";
import logo from "@/public/logo.png";

const Navbar = ({ handleslidein }: any) => {
  const User = {
    _id: "1",
    name: "John Doe",
  };

  const handleLogout = () => {};

  return (
    <header>
      <div>
        <Button onClick={handleslidein}>
          <Menu />
        </Button>

        <div>
          <Link href={"/"}>
            <Image src={logo} alt="stackoverflow clone" />
          </Link>

          <div>
            {["About", "Products", "For Teams"].map((item) => (
              <Link key={item} href={"/"}>
                {item}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};