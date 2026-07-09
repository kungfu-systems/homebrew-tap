class Buildchain < Formula
  desc "Release passport and build evidence toolkit"
  homepage "https://buildchain.libkungfu.dev"
  version "2.11.0"
  license "Apache-2.0"

  if OS.mac? && Hardware::CPU.arm?
    url "https://github.com/kungfu-systems/buildchain/releases/download/v2.11.0/buildchain-aarch64-apple-darwin.tar.gz"
    sha256 "d578f7fdd169085a1b2bba4239aadd1f0c8b85d100a4a005595b56cfedf8102a"
  elsif OS.linux? && Hardware::CPU.intel?
    url "https://github.com/kungfu-systems/buildchain/releases/download/v2.11.0/buildchain-x86_64-unknown-linux-gnu.tar.gz"
    sha256 "f5ed0d1ad2fac7ecf6559c8bdf1713c8175b23826c18e32f03ba417215e819b5"
  else
    odie "Buildchain Homebrew formula currently supports macOS arm64 and Linux x86_64 binary archives."
  end

  def install
    bin.install "buildchain"
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/buildchain version")
  end
end
