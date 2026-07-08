class Buildchain < Formula
  desc "Release passport and build evidence toolkit"
  homepage "https://buildchain.libkungfu.dev"
  version "2.10.2"
  license "Apache-2.0"

  if OS.mac? && Hardware::CPU.arm?
    url "https://github.com/kungfu-systems/buildchain/releases/download/v2.10.2/buildchain-aarch64-apple-darwin.tar.gz"
    sha256 "347805c21c0acca1737dc52afad6fd9ae1d462fece87fc798ec1aa40ecb6aaf7"
  elsif OS.linux? && Hardware::CPU.intel?
    url "https://github.com/kungfu-systems/buildchain/releases/download/v2.10.2/buildchain-x86_64-unknown-linux-gnu.tar.gz"
    sha256 "708fc2c06f8ad744d8dcc57566d4cf16276c238c677d0ea89022a2a35610c375"
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
