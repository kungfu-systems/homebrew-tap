class Buildchain < Formula
  desc "Release passport and build evidence toolkit"
  homepage "https://buildchain.libkungfu.dev"
  version "2.10.0"
  license "Apache-2.0"

  if OS.mac? && Hardware::CPU.arm?
    url "https://github.com/kungfu-systems/buildchain/releases/download/v2.10.0/buildchain-aarch64-apple-darwin.tar.gz"
    sha256 "fadce1fd00233945361162a96db37d01661ce299b98e7d9022a6451fa364b81c"
  elsif OS.linux? && Hardware::CPU.intel?
    url "https://github.com/kungfu-systems/buildchain/releases/download/v2.10.0/buildchain-x86_64-unknown-linux-gnu.tar.gz"
    sha256 "c4323a8a68e6429801509af1adc8aaaec7a834f3baeba964a64ef04f67862e6a"
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
